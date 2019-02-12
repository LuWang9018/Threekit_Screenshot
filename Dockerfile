FROM clara-base

RUN echo "htllo"
RUN apt-get update
RUN apt-get install -y build-essential
RUN apt-get install -y curl
RUN curl -sL https://deb.nodesource.com/setup_8.x | bash
RUN apt-get install -y nodejs

### nvidia drivers & chromium
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --assume-yes nvidia-384=384.130-0ubuntu0.16.04.1 lightdm- libcuda1-384- nvidia-opencl-icd-384- chromium-browser graphicsmagick

ADD https://s3.amazonaws.com/clara-deployment/nvidia-384.webgl.node /srv/clara/current/hub/node_modules/gl/build/Release/webgl.node

WORKDIR /app

# Copy package.json into app folder
COPY package.json /app

# Install dependencies
RUN npm install

COPY . /app

# Start server on port 3000
EXPOSE 3000

# I'll also assume you are going to use root user,
# and your script has `--no-sandbox` and `--disable-setuid-sandbox` arguments.
# We run a fake display and run our script.
# Start script on Xvfb
CMD [ "npm", "run", "watch-server"]
#CMD ["google-chrome-unstable"]




Collapse 