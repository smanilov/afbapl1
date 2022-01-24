#!/bin/bash

docker rm afbpl1-nginx
docker run --name afbpl1-nginx -v $(pwd):/usr/share/nginx/html:ro -p 8080:80 nginx
