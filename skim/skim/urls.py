from django.conf.urls import patterns, include, url
from django.contrib import admin
from skim import views

urlpatterns = patterns('',
    url(r'^$', 'skim.views.home', name='home'),
    url(r'^search$', 'skim.views.search', name='search'),
    url(r'^admin/', include(admin.site.urls)),
)
