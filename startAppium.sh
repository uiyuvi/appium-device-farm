#!/bin/bash
# set up nodeJS with nvm
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

# run appium
appium plugin list
appium plugin install --source npm appium-device-farm
appium plugin list
appium server --use-plugin=device-farm -pa /wd/hub --plugin-device-farm-platform=both