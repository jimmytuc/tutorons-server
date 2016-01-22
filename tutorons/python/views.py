#! /usr/bin/env python
# -*- coding: utf-8 -*-

from __future__ import unicode_literals
import logging
import json
from django.views.decorators.csrf import csrf_exempt
from django.template.loader import get_template
from django.template import Context
from django.http import HttpResponse

from tutorons.common.htmltools import HtmlDocument
from tutorons.common.util import log_region, package_region
from tutorons.common.scanner import NodeScanner
from tutorons.python.detect import PythonBuiltInExtractor
from tutorons.python.explain import explain as python_explain
from tutorons.python.render import render as python_render
from tutorons.python.builtins import explanations
from tutorons.common.extractor import Region
from tutorons.common.dblogger import DBLogger


logging.basicConfig(level=logging.INFO, format="%(message)s")
region_logger = logging.getLogger('region')
db_logger = DBLogger()


@csrf_exempt
def scan(request):
    doc_body = request.POST.get('document')
    origin = request.POST.get('origin')
    region_logger.info("Request for page from origin: %s", origin)
    db_logger.log(request)

    explained_regions = []
    document = HtmlDocument(doc_body)
    builtin_extractor = PythonBuiltInExtractor()

    builtin_scanner = NodeScanner(builtin_extractor, ['code', 'pre'])
    regions = builtin_scanner.scan(document)
    for r in regions:
        log_region(r, origin)
        db_logger.log(request, r)
        hdr, exp, url = python_explain(r.string)
        document = python_render(r.string, hdr, exp, url)
        explained_regions.append(package_region(r, document))

    return HttpResponse(json.dumps(explained_regions, indent=2))


@csrf_exempt
def explain(request):

    text = request.POST.get('text')
    origin = request.POST.get('origin')
    region_logger.info("Request for text from origin: %s", origin)
    db_logger.log(request)

    error_template = get_template('error.html')

    if text in explanations:
        region = Region(HtmlDocument(text), 0, len(text) - 1, text)
        log_region(region, origin)
        db_logger.log(request, region)
        hdr, exp, url = python_explain(text)
        exp_html = python_render(text, hdr, exp, url)
        return HttpResponse(exp_html)
    else:
        logging.error("Error processing python built-in %s", text)
        error_html = error_template.render(Context({'text': text, 'type': 'python built-in'}))
        return HttpResponse(error_html)
