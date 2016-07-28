#! /usr/bin/env python
# -*- coding: utf-8 -*-

from __future__ import unicode_literals
import logging
import os.path
from django.conf import settings

from py4j.java_gateway import launch_gateway, JavaGateway,\
    GatewayParameters, CallbackServerParameters, is_instance_of


logging.basicConfig(level=logging.INFO, format="%(message)s")


# Launch a gateway to the all Java JAR dependencies that we have
classpath = ':'.join([
    os.path.join(settings.DEPS_DIR, jar)
    for jar in os.listdir('deps')
])
port_number = launch_gateway(
    classpath=classpath,
    die_on_exit=True,
)
gateway = JavaGateway(
    gateway_parameters=GatewayParameters(port=port_number),
    callback_server_parameters=CallbackServerParameters(port=0),
)
python_port = gateway.get_callback_server().get_listening_port()
gateway.java_gateway_server.resetCallbackClient(
    gateway.java_gateway_server.getCallbackClient().getAddress(),
    python_port,
)


def java_isinstance(java_object, java_class):
    '''
    Convenience method to abstract away the gateway server to the
    Py4J `is_instance_of` method, which is documented here:
    https://www.py4j.org/py4j_java_gateway.html#javaobject
    '''
    return is_instance_of(gateway, java_object, java_class)
