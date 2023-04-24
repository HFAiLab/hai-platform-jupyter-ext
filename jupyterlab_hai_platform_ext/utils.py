import os
import json
from datetime import datetime

from hfai.client.api import \
    Experiment, BasePod


BASE_TYPES = [BasePod, datetime, str, list, dict, int, float, bool, set, type(None)]


class CustomEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Experiment):
            output_data = {}
            for column in dir(obj):
                try:
                    attr = getattr(obj, column)
                    if column[0] != '_' and any(isinstance(attr, t) for t in BASE_TYPES):
                        output_data[column] = attr
                except:
                    # 是一些需要 implement 的属性
                    pass
            return output_data
        if isinstance(obj, BasePod):
            return {
                'status': obj.status,
                'pod_id': obj.pod_id,
                'node': obj.node,
                'role': obj.role,
                'created_at': obj.created_at,
                'begin_at': obj.begin_at,
                'end_at': obj.end_at,
                'exit_code': obj.exit_code
            }
        if isinstance(obj, datetime):
            return obj.strftime("%Y-%m-%d %H:%M:%S")
        return json.JSONEncoder.default(self, obj)


def custom_json_dumps(obj, *, skipkeys=False, ensure_ascii=True, check_circular=True,
                      allow_nan=True, cls=None, indent=None, separators=None,
                      default=None, sort_keys=False, **kw):
    return json.dumps(obj, skipkeys=skipkeys, ensure_ascii=ensure_ascii, check_circular=check_circular,
                      allow_nan=allow_nan, cls=cls if cls else CustomEncoder, indent=indent, separators=separators,
                      default=default, sort_keys=sort_keys, **kw)
