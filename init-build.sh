#!/bin/bash

# ./init-build.sh -p /tmp/test_cerebro/test4/v8.19.0/65916/Prebid.js -m build -t display -w wrapper -x OW
# gulp bundle --modules=modules.json --isIdentityOnly=<IDENTITY_FLAG> --pbNamespace=<PREBID_NAMESPACE> --owNamespace=<OW_NAMESPACE> --bundleName=pwt.js --usePBJSKeys=<USE_PBJS_KEYS>
# ./init-build.sh -m bundle -t display -i 1 -p owpbjs -o PWT -b pwt.js -k 1
# Steps
# run sym links for node_modules folder
# run npm install in Prebid.js repo ( accept path for the same ? )
# run build.sh with arguments accepted while executing this script

if [ $# -eq 0 ]
  then
    echo " No arguments supplied"
    echo " Provide build mode using -m flag" 
    echo " Provide platform using -t flag"
    echo " Provide is identity only flag using -i flag"
    echo " Provide Prebid namespace using -p flag"
    echo " Provide OpenWrap namespace using -o flag"
    echo " Provide bundle name using -b flag" 
    echo " Provide use PBJS keys using -k flag"
    echo " Example: ./init-build.sh -m bundle -t display -i 1 -p owpbjs -o PWT -b pwt.js -k 1"
    exit 1
fi

PLATFORM_DISPLAY="display"
PLATFORM_AMP="amp"
echo "$(date) This is Reading Params"
while getopts ":m:t:i:p:o:b:k:" opt; do
  case $opt in
    m) mode="$OPTARG"
    ;;
    t) platform="$OPTARG"
    ;;
    i) isIdentityOnly="$OPTARG"
    ;;
    p) pbNamespace="$OPTARG"
    ;;
    o) owNamespace="$OPTARG"
    ;;
    b) bundleName="$OPTARG"
    ;;
    k) usePBJSKeys="$OPTARG"
    ;;
    \?) echo "Invalid option -$OPTARG" >&2
    ;;
  esac
done
echo "This is Reading Params Done"

if [ -z $mode ]
  then
        echo "Please provide appropriate mode argument "
        exit 1
fi


if [ -z $platform ]
then
      echo "Please provide appropriate platform argument "
      exit 1
fi

echo "This is SymLinking Start for Prebid"

# echo //ci.pubmatic.com:4873/:_authToken=WeepY06w3S9VfbF4gdm42piZepf9+95zj7dd1AEtAVcfuW0S9u5COPSVS5K39CSF > .npmrc
# npm install uas-adclient@0.0.1-master.13 --registry=http://ci.pubmatic.com:4873 --save
#
# npm install
  
# Change directory to the one provided as the first argument
# cd $1

# Define the path to the global Prebid.js node_modules directory
PrebidJSNodeModules="${GLOBAL_PREBID_PKG_JSON_DIR_V9_6_0}/node_modules/"

# Define the name of the symlink to be created
symLinkForPrebidNodeModules=node_modules

# Check if the symlink already exists and remove it if it does
if [ -L $symLinkForPrebidNodeModules ]; then
  unlink $symLinkForPrebidNodeModules
fi

# Create a new symlink from the global Prebid.js node_modules directory
# to the local node_modules directory
ln -s "$PrebidJSNodeModules" "./node_modules"

echo "This is SymLinking Stop fro Prebid"



if [ "$platform" = "$PLATFORM_DISPLAY" ] || [ -z $platform ]
  then
    if [ -z $isIdentityOnly ]
    then
          echo "Please provide appropriate isIdentityOnly argument "
          exit 1
    fi
    time ./build.sh --mode=$mode --platform=$platform --isIdentityOnly=$isIdentityOnly --pbNamespace=$pbNamespace --owNamespace=$owNamespace --bundleName=$bundleName --usePBJSKeys=$usePBJSKeys

elif [ "$platform" = "$PLATFORM_AMP" ]
   then
    echo "Building for AMP"
    time ./build.sh --mode=$mode --platform=$platform
else
  echo "None"
fi
