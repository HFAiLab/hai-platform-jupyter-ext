import json
import os.path as osp

from ._version import __version__

HERE = osp.abspath(osp.dirname(__file__))

with open(osp.join(HERE, 'labextension', 'package.json')) as fid:
    data = json.load(fid)


def _jupyter_labextension_paths():
    return [{
        'src': 'labextension',
        'dest': data['name']
    }]


from .handlers import setup_handlers


def _jupyter_server_extension_points():
    return [{
        "module": "jupyterlab_hai_platform_ext"
    }]


def _load_jupyter_server_extension(server_app):
    """Registers the API handler to receive HTTP requests from the frontend extension.

    Parameters
    ----------
    lab_app: jupyterlab.labapp.LabApp
        JupyterLab application instance
    """
    setup_handlers(server_app)
    server_app.log.info("Registered extension at URL path /jupyterlab_hai_platform_ext")


load_jupyter_server_extension = _load_jupyter_server_extension