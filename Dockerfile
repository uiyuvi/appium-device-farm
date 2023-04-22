FROM appium/appium

#==================
# General Packages
#------------------
# ca-certificates
#   SSL client
# curl
#   Transfer data from or to a server
# gnupg
#   Encryption software. It is needed for nodejs
# libgconf-2-4
#   Required package for chrome and chromedriver to run on Linux
# libqt5webkit5
#   Web content engine (Fix issue in Android)
# openjdk-11-jdk
#   Java
# sudo
#   Sudo user
# tzdata
#   Timezone
# unzip
#   Unzip zip file
# wget
#   Network downloader
# xvfb
#   X virtual framebuffer
# zip
#   Make a zip file
#==================
## grab go-iOS from github
RUN wget https://github.com/danielpaulus/go-ios/releases/latest/download/go-ios-linux.zip
RUN unzip go-ios-linux.zip


#==============
# Copy scripts
#==============
WORKDIR /home/androidusr
RUN chmod +x /home/androidusr
#ADD . /home/androidusr

#=====================
# Install Android SDK
#=====================
#ENV SDK_VERSION=commandlinetools-linux-8512546_latest
#ENV ANDROID_BUILD_TOOLS_VERSION=33.0.0
#ENV ANDROID_FOLDER_NAME=cmdline-tools
#ENV ANDROID_DOWNLOAD_PATH=/home/androidusr/${ANDROID_FOLDER_NAME} \
#    ANDROID_HOME=/opt/android \
#    ANDROID_TOOL_HOME=/opt/android/${ANDROID_FOLDER_NAME}
#
#RUN wget -O tools.zip https://dl.google.com/android/repository/${SDK_VERSION}.zip && \
#    unzip tools.zip && rm tools.zip && \
#    chmod a+x -R ${ANDROID_DOWNLOAD_PATH} && \
#    chown -R 1300:1301 ${ANDROID_DOWNLOAD_PATH} && \
#    mkdir -p ${ANDROID_TOOL_HOME} && \
#    mv ${ANDROID_DOWNLOAD_PATH} ${ANDROID_TOOL_HOME}/tools
#ENV PATH=$PATH:${ANDROID_TOOL_HOME}/tools:${ANDROID_TOOL_HOME}/tools/bin
#
## https://askubuntu.com/questions/885658/android-sdk-repositories-cfg-could-not-be-loaded
#RUN mkdir -p ~/.android && \
#    touch ~/.android/repositories.cfg && \
#    echo y | sdkmanager "platform-tools" && \
#    echo y | sdkmanager "build-tools;$ANDROID_BUILD_TOOLS_VERSION" && \
#    mv ~/.android .android && \
#    chown -R 1300:1301 .android
#ENV PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/build-tools

ENV SCRIPT_PATH="appium-docker-android"
RUN mkdir -p ${SCRIPT_PATH}
COPY startAppium.sh \
     ${SCRIPT_PATH}/
ENV APP_PATH=/home/androidusr/${SCRIPT_PATH}
RUN appium --version
#==================
# Use created user
#==================

# set up nvm and add a little hack so installing appium will work as the root user
#===============================
# Install basic Android drivers
#===============================
ENV APPIUM_DRIVER_ESPRESSO_VERSION="2.20.1"
ENV APPIUM_DRIVER_FLUTTER_VERSION="1.14.3"
ENV APPIUM_DRIVER_GECKO_VERSION="1.1.9"
ENV APPIUM_DRIVER_UIAUTOMATOR2_VERSION="2.14.0"
#RUN appium plugin install --source npm appium-device-farm
#===============
# Expose Port
#---------------
# 4723
#   Appium port
#===============
EXPOSE 4723
# set up nodeJS with nvm
COPY startAppium.sh /home/androidusr/
ENTRYPOINT ["/bin/bash","-c","/home/androidusr/startAppium.sh"]