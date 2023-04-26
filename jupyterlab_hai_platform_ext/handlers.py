# autocorrect: false
import json
import os
import sys
import tornado
import logging
import asyncio
import traceback
import subprocess
from munch import Munch
import time
from datetime import datetime
from .utils import custom_json_dumps
from notebook.utils import url_path_join
from notebook.base.handlers import APIHandler
from jupyterlab.commands import get_workspaces_dir
import logging
import requests

logger = logging.getLogger("hfai-lab")

MARSV2_SPOT_JUPYTER = os.environ.get('MARSV2_SPOT_JUPYTER', '0')

# The JupyterLab workspace file extension.
WORKSPACE_EXTENSION = '.jupyterlab-workspace'

try:
    from hfai.client.api import \
        get_user_info, create_experiment, \
        Experiment, set_user_gpu_quota, create_node_port_svc, ExperimentImpl, \
        get_user_personal_storage, set_swap_memory, get_tasks_overview, get_cluster_overview, \
        set_watchdog_time
    from hfai.client.api.experiment_api import validate_experiment
except ImportError as e:
    print(
        '\n\n\n=====================[HFAI_EXT ImportError] import error:=====================', e)
    raise

CLUSTER = os.environ.get('JUPYTER_LAB_CLUSTER', 'default')
SCP_TARGET_HOST = None

# hint: 如果要自己定义请求地址，设置这几个环境变量：
# MARSV2_USER_TOKEN MARSV2_SERVER MARSV2_BFF_URL MARSV2_VENV_PATH
UPDATE_INTERVAL_SECONDS = 6
USE_SSH = os.environ.get('JUPYTER_LAB_USE_SSH', '1') == '1'
USER = os.environ.get('JUPYTER_LAB_USER', 'invalid_user')
USER_ROLE = os.environ.get('MARSV2_USER_ROLE', None)

# 默认的 watchdog time，内部用户默认无限，外部用户默认 1 天
DEFAULT_WATCHDOG_TIME = 99999999 if USER_ROLE == 'internal' else 86400
# 外部用户每次点击可以增加的运行时长，默认 1 天，增加时长是指，如果不做其他操作，可以延长运行到 当前时间 + RENEW_WATCHDOG_TIME 的时刻
RENEW_WATCHDOG_TIME = 86400
# 开始运行的时间
START_TIME = time.time()
# 当前的 watchdog time
CURRENT_WATCHDOG_TIME = DEFAULT_WATCHDOG_TIME
set_watchdog_time(CURRENT_WATCHDOG_TIME)

# 存储 ssh 配置，只需成功获取一次之后就不用再向 server 请求
SSH_CONFIG = None

def get_init_info_chain_id(chain_id):
    return f'init_info:{chain_id}'


async def run_cmd_aio(cmd, timeout=3):
    try:
        create = asyncio.create_subprocess_shell(
            cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
        proc = await create
        read_task = asyncio.Task(proc.communicate())
        # timeout=3s
        stdout, stderr = await asyncio.wait_for(read_task, timeout)
        if proc.returncode != 0:
            print(cmd, '->', 'Run Failed')
            # 不向外暴露cmd
            raise subprocess.CalledProcessError(
                proc.returncode, '', stdout, stderr)
    except asyncio.TimeoutError:
        print(cmd, '->', 'Run Timeout')
        read_task.cancel()
        raise
    return stdout, stderr


async def send_code_to_shared_space(root_dir: str, token: str):
    """transfer code directory to shared space"""
    if not SCP_TARGET_HOST:
        return root_dir
    user_info = await get_user_info(cluster=CLUSTER, token=token)
    assert user_info is not None, "不存在该用户"
    code_dir = user_info['code_dir']
    logger.info(f'user_info -> {user_info}')
    timestamp = str(int(datetime.now().timestamp() * 1000))
    target_path = f'{code_dir}/{timestamp}/'
    ssh_config = 'ssh -o LogLevel=ERROR -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no'
    if os.path.exists('/ssh/id_rsa'):  # 若有 key 在 mount 点
        ssh_config = f'{ssh_config} -i /ssh/id_rsa'
    code = (
        f'rsync -za '
        f'--include="*/" --include="*.sh" --include="*.py" --include="*.yaml" --include="*.yml" '
        f'--exclude="*" --exclude=".*" '
    ) + (
        f'-e "{ssh_config}" ' if USE_SSH else ''
    ) + (
        f'{root_dir}/* '  # src
    ) + (
        f'{USER}@{SCP_TARGET_HOST}:{target_path}' if USE_SSH else target_path  # dst
    )
    logger.info(code)
    os.system(code)
    return target_path


class HandlerExperiment(Experiment):
    """
    记录一些 local 变量
    """
    __exp_logs = {}

    @staticmethod
    async def get_log_ng(experiment: Experiment, rank: int = 0, token: str = ''):
        exp_label = f"{experiment.chain_id}-{rank}"
        if not HandlerExperiment.__exp_logs.get(exp_label):
            log = await experiment.log_ng(rank=rank, token=token)
            HandlerExperiment.__exp_logs[exp_label] = {
                'data': log['data'],
                'last_seen': experiment.last_seen,
            }
            return log
        else:
            last_log = HandlerExperiment.__exp_logs[exp_label]
            current_last_seen = json.dumps(last_log['last_seen'])
            log = await experiment.log_ng(rank=rank, token=token, last_seen=current_last_seen)
            # 防止两个请求交叉执行
            if json.dumps(last_log['last_seen']) == current_last_seen:
                last_log['data'] = '' if last_log['data'] == '还没产生日志' else last_log['data']
                last_log['data'] = last_log['data'] + log['data']
                last_log['last_seen'] = experiment.last_seen
                last_log['error_msg'] = log.get('error_msg', '')
            return last_log

    @staticmethod
    async def get_sys_log(experiment: Experiment, token: str = ''):
        log = await experiment.sys_log(token=token)
        return log


def response_formatter(status_code: int, success: int, msg: str, output_data=None):
    """规定的返回格式"""
    return status_code, {
        'success': success,
        'msg': msg,
        'output_data': output_data
    }


async def post_formatter(post_handler: APIHandler, ignore_token=False):
    try:
        token = post_handler.request.headers['token']
        if token == 'null' or token == 'undefined':
            if ignore_token:
                token = 'no_need_token'
            else:
                token = None
        assert token, 'header中没有user token'
        try:
            action = post_handler.request.query_arguments['action'][0].decode(
                encoding='utf-8')
        except:
            action = None
        input_data = post_handler.get_json_body()
        return token, action, input_data
    except Exception as e:
        status_code, response_data = response_formatter(
            400, 0, f"POST请求预处理出错: {repr(e)}")
        post_handler.set_status(status_code)
        await post_handler.finish(custom_json_dumps(response_data, ensure_ascii=False))
        raise Exception("POST请求预处理出错")


class ClusterHandler(APIHandler):
    @tornado.web.authenticated
    async def post(self):
        token, action, input_data = await post_formatter(self)
        try:
            methods: dict = {
                'get_cluster_info': self.get_cluster_info
            }
            output_data = await methods[action](input_data, token=token, api_handler=self)
            status_code, response_data = output_data
        except Exception as e:
            status_code, response_data = response_formatter(400, 0, repr(e))
        self.set_status(status_code)
        await self.finish(custom_json_dumps(response_data, ensure_ascii=False))

    @staticmethod
    async def get_cluster_info(input_data, **kwargs):
        """get cluster info"""
        return response_formatter(200, 1, 'success', output_data={})


class ExperimentHandler(APIHandler):
    @tornado.web.authenticated
    async def post(self):
        token, action, input_data = await post_formatter(self)
        try:
            methods: dict = {
                'create_experiment': self.create_experiment,
                'stop_experiment': self.stop_experiment,
                'star_experiment': self.star_experiment,
                'unstar_experiment': self.unstar_experiment,
                'suspend_experiment': self.suspend_experiment,
                'run_validate': self.run_validate,
                'get_experiment_log': self.get_experiment_log,
                'search_in_global': self.search_in_global,
                'get_experiment_sys_log': self.get_experiment_sys_log,
                'get_chain_perf_series': self.get_chain_perf_series_handler
            }
            output_data = await methods[action](input_data, token=token, api_handler=self)
            status_code, response_data = output_data
        except Exception as e:
            status_code, response_data = response_formatter(401, 0, repr(e)) if repr(
                e).find('非法token') >= 0 else response_formatter(400, 0, repr(e))
        self.set_status(status_code)
        await self.finish(custom_json_dumps(response_data, ensure_ascii=False))

    @staticmethod
    async def create_experiment(input_data, **kwargs):
        print('create_experiment use create_experiment \n')
        """create experiment"""
        token = kwargs['token']
        root_dir = kwargs['api_handler'].contents_manager.root_dir
        directory = input_data['directory'].replace(' ', '')
        entrypoint = input_data['entrypoint'].replace(' ', '')
        parameters = input_data.get('parameters', "")
        remote_directory = await send_code_to_shared_space(root_dir, token)
        container = input_data['container']
        groups = input_data['groups']
        whole_life_state = input_data.get('whole_life_state', 0)
        priority = input_data.get('priority', 0)
        environments = input_data.get('environments', {})
        py_venv = input_data.get('py_venv', None)
        entrypoint_executable = input_data.get('entrypoint_executable', False)
        watchdog_time = input_data.get('watchdog_time', 0)
        tags = input_data.get('tags', [])
        sidecar = input_data.get('sidecar', [])
        fffs_enable_fuse = input_data.get('fffs_enable_fuse', None)

        logger.info(f'create_experiment: {entrypoint}')

        config = Munch({
            "version": 2,
            "token": token,
            "name": input_data['nb_name'].replace(' ', ''),
            "priority": priority,
            "spec": Munch({
                "workspace": os.path.join(remote_directory, directory),
                "entrypoint": entrypoint,
                "environments": environments,
                "entrypoint_executable": entrypoint_executable,
            }),
            "resource": Munch({
                "image": container, # 比如 cuda_11，以前叫做 container，现在叫做 image
                "group": groups[0]['group'],
                "node_count": groups[0]['node_count'], # hint: 之前是一个数组，后面考虑不做成数组了
            }),
            "options": Munch({
                "mount_code": input_data.get('mount_code', 2),
                "py_venv": py_venv, # 在运行脚本前，source 一下 python 环境
                "sidecar": sidecar,
                "fffs_enable_fuse": fffs_enable_fuse
            }),
        })

        # extra
        if parameters:
            config.spec.parameters = parameters
        if len(tags):
            config.options.tags = tags
        if watchdog_time != 0:
            config.options.watchdog_time = watchdog_time
        if whole_life_state:
            config.options.whole_life_state =whole_life_state

        experiment = await create_experiment(config)
        return response_formatter(200, 1, 'success', output_data=experiment)

    @staticmethod
    async def stop_experiment(input_data, **kwargs):
        """stop experiment"""
        chain_id = input_data['chain_id']
        await Experiment(ExperimentImpl, chain_id=chain_id).stop(token=kwargs['token'])
        return response_formatter(200, 1, 'success', output_data="stop指令发送成功")

    @staticmethod
    async def star_experiment(input_data, **kwargs):
        """star experiment"""
        chain_id = input_data['chain_id']
        res = await Experiment(ExperimentImpl, chain_id=chain_id).star_task(token=kwargs['token'])
        return response_formatter(200, 1, 'success', output_data=res)

    @staticmethod
    async def unstar_experiment(input_data, **kwargs):
        """unstar experiment"""
        chain_id = input_data['chain_id']
        res = await Experiment(ExperimentImpl, chain_id=chain_id).unstar_task(token=kwargs['token'])
        return response_formatter(200, 1, 'success', output_data=res)

    @staticmethod
    async def suspend_experiment(input_data, **kwargs):
        """suspend experiment"""
        await Experiment(ExperimentImpl, chain_id=input_data['chain_id']).suspend(restart_delay=input_data['restart_delay'], token=kwargs['token'])
        return response_formatter(200, 1, 'success', output_data="suspend指令发送成功")

    @staticmethod
    async def run_validate(input_data, **kwargs):
        """run validate for a task"""
        task_id = input_data['id']
        ranks = input_data.get('ranks', [])
        print("run_validate task_id:", task_id)
        print("run_validate ranks:", tuple(ranks))

        res = await validate_experiment(id=task_id, ranks=tuple(ranks))
        print("run validate res:", res)
        if res['success'] == 1:
            return response_formatter(200, 1, 'success', output_data=res['msg'])
        else:
            return response_formatter(500, 0, res['msg'])

    @staticmethod
    async def get_experiment_log(input_data, **kwargs):
        """get experiment log"""
        exp = Experiment(ExperimentImpl, chain_id=input_data['chain_id'])
        log = await HandlerExperiment.get_log_ng(exp, rank=input_data['rank'], token=kwargs['token'])
        return response_formatter(200, 1, 'success', output_data=log)

    @staticmethod
    async def search_in_global(input_data, **kwargs):
        """search log in all nodes for an experiment"""
        exp = Experiment(ExperimentImpl, chain_id=input_data['chain_id'])
        res = await exp.search_in_global(content=input_data['content'], chain_id=input_data['chain_id'], token=kwargs['token'])
        return response_formatter(200, 1, 'success', output_data=res)

    @staticmethod
    async def get_experiment_sys_log(input_data, **kwargs):
        """get experiment system log"""
        exp = Experiment(ExperimentImpl, chain_id=input_data['chain_id'])
        log = await HandlerExperiment.get_sys_log(exp, token=kwargs['token'])
        return response_formatter(200, 1, 'success', output_data=log)

    @staticmethod
    async def get_chain_perf_series_handler(input_data, **kwargs):
        """get performance series for chain"""
        series = await Experiment(ExperimentImpl, chain_id=input_data['chain_id']).get_chain_time_series(
            query_type=input_data['typ'], rank=input_data['rank'], token=kwargs['token'], data_interval=input_data.get('data_interval', '5min'))
        if series is None:
            raise Exception('get_chain_perf_series_handler series is null')
        return response_formatter(200, 1, 'success', series)


class ConvertIpynbHandler(APIHandler):
    @tornado.web.authenticated
    async def post(self):
        # print('convert ----------- called')
        token, action, input_data = await post_formatter(self)
        try:
            path = input_data['path']
            root_dir = self.contents_manager.root_dir
            raw_path = os.path.abspath(os.path.join(root_dir, path))
            if not raw_path.endswith('.ipynb'):
                raise ValueError('只能转换ipynb文件')
            if not os.path.exists(raw_path):
                raise ValueError('找不到指定的文件')

            dir_name = os.path.dirname(raw_path)
            file_name = os.path.basename(raw_path)

            if action == "convert":
                target_file = raw_path[:-6] + '.py'
                if os.path.exists(target_file):
                    raise ValueError('当前已经存在与.ipynb同名的.py文件，请处理冲突后再转换')

                cmd = f'cd "{dir_name}" && jupyter nbconvert --to script "{file_name}"'
                await run_cmd_aio(cmd, timeout=5)
                assert os.path.exists(
                    target_file), 'Converted file not exist.\n Maybe this file can not convert to ".py" file.\nTry to Check if there has illegal lines(like bash cmd) and fix it.'

            elif action == "clear":
                cp_target = raw_path[:-6] + '_' + datetime.strftime(
                    datetime.now(), '%y%m%d_%H%M%S') + '.ipynb.bak'
                assert (not os.path.exists(os.path.join(dir_name, cp_target))
                        ), f"Clear failed. Backup target:{cp_target} already exist."

                cmd = "".join([f'cd "{dir_name}" ',
                               f'&& cp "{file_name}" "{cp_target}" ',
                               f'&& jupyter nbconvert',
                               f' --clear-output',
                               f' --ClearOutputPreprocessor.enabled=True',
                               f' --inplace "{file_name}"'])
                await run_cmd_aio(cmd, timeout=5)

            else:
                raise ValueError(f'{action} is not a Valid action')

            status_code, response_data = response_formatter(
                200, 1, 'success', output_data=f'{action} "{path}" succeeded!')

            self.set_status(status_code)
            await self.finish(custom_json_dumps(response_data, ensure_ascii=False))

        except Exception as e:
            print(traceback.format_exc())
            status_code, response_data = response_formatter(400, 0, repr(e))
            if repr(e).find('非法token') >= 0:
                status_code, response_data = response_formatter(
                    401, 0, repr(e))
            self.set_status(status_code)
            await self.finish(custom_json_dumps(response_data, ensure_ascii=False))


class UserHandler(APIHandler):
    @tornado.web.authenticated
    async def post(self):
        token, action, input_data = await post_formatter(self)
        try:
            token = self.request.headers.get('token', None)
            if not token:
                raise ValueError('非法token')
            methods: dict = {
                'set_user_gpu_quota': self.set_user_gpu_quota,
                'get_user_role': self.get_user_role,
                'get_storage': self.get_storage,
                'get_global_tasks_overview': self.get_global_tasks_overview,
                'get_global_cluster_overview': self.get_global_cluster_overview,
                'get_haienv_list': self.get_haienv_list
            }
            output_data = await methods[action](input_data, token=token, api_handler=self)
            status_code, response_data = output_data
        except Exception as e:
            status_code, response_data = response_formatter(401, 0, repr(e)) if repr(
                e).find('非法token') >= 0 else response_formatter(400, 0, repr(e))
        self.set_status(status_code)
        await self.finish(custom_json_dumps(response_data, ensure_ascii=False))

    @staticmethod
    async def set_user_gpu_quota(input_data, **kwargs):
        """set user gpu quota"""
        group_label = input_data['group_label']
        priority_label = input_data['priority_label']
        quota = input_data['quota']
        resp = await set_user_gpu_quota(group_label, priority_label, quota, token=kwargs['token'])
        return response_formatter(200, 1, 'success', resp)

    @staticmethod
    async def get_storage(input_data, **kwargs):
        """get storage list"""
        resp = await get_user_personal_storage(token=kwargs['token'])
        return response_formatter(200, 1, 'success', resp)


    @staticmethod
    async def get_user_role(input_data, **kwargs):
        return response_formatter(200, 1, 'success', {'user_role': USER_ROLE})

    @staticmethod
    async def get_global_tasks_overview(input_data, **kwargs):
        resp = await get_tasks_overview(token=kwargs['token'])
        return response_formatter(200, 1, 'success', resp)

    @staticmethod
    async def get_global_cluster_overview(input_data, **kwargs):
        resp = await get_cluster_overview(token=kwargs['token'])
        return response_formatter(200, 1, 'success', resp)

    @staticmethod
    async def get_haienv_list(input_data, **kwargs):
        cmd = 'haienv list -ojson'
        stdout, stderr = await run_cmd_aio(cmd)
        resp = json.loads(stdout.strip())
        return response_formatter(200, 1, 'success', resp)



class JupyterHandler(APIHandler):
    """
    这里提供 jupyter 相关功能的接口
    """

    @tornado.web.authenticated
    async def post(self):
        token, action, input_data = await post_formatter(self)
        try:
            token = self.request.headers.get('token', None)
            if not token:
                raise ValueError('非法token')
            methods: dict = {
                'get_server_name': self.get_server_name,
                'get_ssh_info': self.get_ssh_info,
                'swap_memory': self.swap_memory,
                'get_memory_metrics': self.get_memory_metrics,
                'get_watchdog_info': self.get_watchdog_info,
                'renew_watchdog_time': self.renew_watchdog_time,
            }
            output_data = await methods[action](input_data, token=token, api_handler=self)
            status_code, response_data = output_data
        except Exception as e:
            status_code, response_data = response_formatter(401, 0, repr(e)) if repr(e).find(
                '非法token') >= 0 else response_formatter(400, 0, repr(e))
        self.set_status(status_code)
        await self.finish(custom_json_dumps(response_data, ensure_ascii=False))

    @staticmethod
    async def get_server_name(input_data, **kwargs):
        """set current named-server name"""
        server_name = os.environ.get('HF_NB_NAME', None)
        if server_name is None:
            resp = {
                'msg': '这个 Jupyter 不是集群环境启动的任务',
                'server_name': None
            }
        else:
            resp = {
                'msg': '这个 Jupyter 是用户以集群任务提交方式启动的',
                'server_name': server_name
            }
        return response_formatter(200, 1, 'success', resp)

    @staticmethod
    async def get_ssh_info(input_data, **kwargs):
        """get ssh info"""
        global SSH_CONFIG
        if SSH_CONFIG:
            return response_formatter(200, 1, 'success', SSH_CONFIG)
        resp = await create_node_port_svc(usage='ssh', dist_port=22, token=kwargs['token'])
        SSH_CONFIG = resp
        return response_formatter(200, 1, 'success', resp)

    @staticmethod
    async def swap_memory(input_data, **kwargs):
        """get ssh info"""
        resp = await set_swap_memory(swap_limit=input_data['swap_limit'], token=kwargs['token'])
        return response_formatter(200, 1, 'success', resp)

    @staticmethod
    async def get_memory_metrics(input_data, **kwargs):
        """get memory stat"""
        with open(f"/sys/fs/cgroup/memory/memory.stat") as f:
            mem_stats = {
                l.split(' ')[0]: int(l.split(' ')[1])
                for l in f.read().split('\n') if l.find(' ') >= 0
            }
        with open(f"/sys/fs/cgroup/memory/memory.kmem.usage_in_bytes") as f:
            kmem = int(f.read())
        res = {
            'memory_limit': mem_stats.get('hierarchical_memory_limit', 0) / 1024 / 1024 / 1024,
            'kernel_memory_usage': kmem / 1024 / 1024 / 1024,
            'memory_usage': (kmem + mem_stats.get('total_rss', 0) + mem_stats.get('total_cache', 0)) / 1024 / 1024 / 1024,
            'memory_rss_usage': mem_stats.get('total_rss', 0) / 1024 / 1024 / 1024,
            'memory_cache_usage': mem_stats.get('total_cache', 0) / 1024 / 1024 / 1024,
            'memory_swap_enable': mem_stats.get('hierarchical_memsw_limit', 0) > mem_stats.get('hierarchical_memory_limit', 0),
            'memory_swap_usage': mem_stats.get('total_swap', 0) / 1024 / 1024 / 1024
        }
        return response_formatter(200, 1, 'success', res)


    @staticmethod
    async def get_watchdog_info(input_data, **kwargs):
        """get watchdog info"""
        resp = {
            'running_seconds': time.time() - START_TIME,
            'renew_watchdog_time': RENEW_WATCHDOG_TIME,
            'current_watchdog_time': CURRENT_WATCHDOG_TIME,
            'MARSV2_SPOT_JUPYTER': MARSV2_SPOT_JUPYTER
        }
        return response_formatter(200, 1, 'success', resp)

    @staticmethod
    async def renew_watchdog_time(input_data, **kwargs):
        """renew watchdog time"""
        global CURRENT_WATCHDOG_TIME
        running_seconds = time.time() - START_TIME
        # 最多可以延期到 running_seconds + RENEW_WATCHDOG_TIME
        CURRENT_WATCHDOG_TIME = int(max([DEFAULT_WATCHDOG_TIME, running_seconds + RENEW_WATCHDOG_TIME]))
        set_watchdog_time(CURRENT_WATCHDOG_TIME)
        resp = {
            'msg': f'设置 watchdog_time 到 {CURRENT_WATCHDOG_TIME} 成功'
        }
        return response_formatter(200, 1, 'success', resp)


class JupyterNoHFAuthHandler(APIHandler):
    """
    这里提供 jupyter 相关功能的接口
    """

    @tornado.web.authenticated
    async def post(self):
        _, action, input_data = await post_formatter(self, True)
        try:
            methods: dict = {
                'get_cluster_config': self.get_cluster_config,
            }
            output_data = await methods[action](input_data, api_handler=self)
            status_code, response_data = output_data
        except Exception as e:
            status_code, response_data = response_formatter(401, 0, repr(e)) if repr(e).find(
                '非法token') >= 0 else response_formatter(400, 0, repr(e))
        self.set_status(status_code)
        await self.finish(custom_json_dumps(response_data, ensure_ascii=False))


    @staticmethod
    async def get_cluster_config(input_data, **kwargs):
        # 这里要用环境变量 ，需要用户去设置
        if os.environ.get('BFF_URL'):
            res = {
                'bffURL':  os.environ.get('BFF_URL'), # JUPYTER_BFF_URL
                'wsURL': os.environ.get('WS_URL'), # JUPYTER
                'clusterServerURL': os.environ.get('CLUSTER_SERVER_URL'), # 集群地址
            }
            if os.environ.get('JUPYTER_COUNTLY_URL') and os.environ.get('JUPYTER_COUNTLY_API_KEY'):
                res['countly'] = {
                    'apiKey': os.environ.get('JUPYTER_COUNTLY_API_KEY'),
                    'url': os.environ.get('JUPYTER_COUNTLY_URL')
                }
            return response_formatter(200, 1, 'success', res)
        else:
            return response_formatter(200, 1, 'success', None)

def setup_handlers(server_app):
    web_app = server_app.web_app
    global logger
    logger = server_app.log
    host_pattern = ".*$"
    base_url = web_app.settings["base_url"]
    route_experiment = url_path_join(base_url, "jupyterlab_hai_platform_ext", "experiment")
    route_user = url_path_join(base_url, "jupyterlab_hai_platform_ext", "user")
    route_cluster = url_path_join(base_url, "jupyterlab_hai_platform_ext", "cluster")
    route_convert = url_path_join(base_url, "jupyterlab_hai_platform_ext", "ipynb_convert")
    route_jupyter = url_path_join(base_url, "jupyterlab_hai_platform_ext", "jupyter")
    route_jupyter_no_hf_auth = url_path_join(
        base_url, "jupyterlab_hai_platform_ext", "jupyter_no_hf_auth")
    handlers = [
        (route_cluster, ClusterHandler),
        (route_experiment, ExperimentHandler),
        (route_convert, ConvertIpynbHandler),
        (route_user, UserHandler),
        (route_jupyter, JupyterHandler),
        (route_jupyter_no_hf_auth, JupyterNoHFAuthHandler)
    ]
    web_app.add_handlers(host_pattern, handlers)
