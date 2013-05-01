# This file describes how to bundle Couchdb and its dependencies into a standalone container which can run on any server.
# # To build:
# # 1) Install docker (http://docker.io)
# # 2) Download the docker-build helper script: wget https://raw.github.com/dotcloud/docker/v0.2.0/contrib/docker-build/docker-build 
# # 3) Build all the layers: python docker-build < Dockerfile | tee build.out
# # 4) Tag your new container to easily retrieve it: IMG=$(tail -n 1 build.out); docker tag $IMG $USER/couchdb;
# # 5) Run it: docker run -p 5984 $USER/couchdb/bin/sh -e /usr/bin/couchdb -a /etc/couchdb/default.ini -a /etc/couchdb/local.ini -b -r 5 -p /var/run/couchdb/couchdb.pid -o /dev/null -e /dev/null -R
# #

version	0.1
maintainer	Solomon Hykes <solomon@dotcloud.com>
from	ubuntu:12.10
run	apt-get update
run	apt-get install -y couchdb && /etc/init.d/couchdb stop
run	sed -e 's/^bind_address = .*$/bind_address = 0.0.0.0/' -i /etc/couchdb/default.ini
expose	5984
cmd	["/bin/sh", "-e", "/usr/bin/couchdb", "-a", "/etc/couchdb/default.ini", "-a", "/etc/couchdb/local.ini", "-b", "-r", "5", "-p", "/var/run/couchdb/couchdb.pid", "-o", "/dev/null", "-e", "/dev/null", "-R"]
