# Serves the simulator with nginx. No build step: the repo is the site.
#   docker build -t ncp-ain-sim .
#   docker run --rm -d -p 8080:80 --name ncp-ain-sim ncp-ain-sim
#   -> http://localhost:8080/
FROM nginx:alpine
COPY index.html /usr/share/nginx/html/
COPY css/ /usr/share/nginx/html/css/
COPY js/  /usr/share/nginx/html/js/
EXPOSE 80
