FROM budtmo/docker-android:emulator_13.0

RUN chmod +x /home/androidusr
ENV SCRIPT_PATH="appium-docker-android"
RUN mkdir -p ${SCRIPT_PATH}
COPY startAppium.sh \
     ${SCRIPT_PATH}/
ENV APP_PATH=/home/androidusr/${SCRIPT_PATH}
RUN appium --version
ADD . /home/androidusr/${SCRIPT_PATH}
RUN echo ${pwd}
EXPOSE 4723
# set up nodeJS with nvm
COPY startAppium.sh /home/androidusr/
ENTRYPOINT ["/bin/bash","-c","/home/androidusr/startAppium.sh"]