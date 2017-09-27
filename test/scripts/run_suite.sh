#!/usr/bin/env bash

export WSK=${WSK-wsk}

echo "Running Convo-Flexible-Bot test suite."
cd ../../;

# Run setup scripts needed to build "mock" actions for integration tests
  SETUP_SCRIPT='./test/integration/conversation/setup.sh'
  if [ -f $SETUP_SCRIPT ]; then
    bash $SETUP_SCRIPT $__TEST_PIPELINE_NAME
  fi
  SETUP_SCRIPT='./test/integration/starter-code/setup.sh'
  if [ -f $SETUP_SCRIPT ]; then
    bash $SETUP_SCRIPT $__TEST_PIPELINE_NAME
  fi
  for folder in './test/integration/channels'/*; do
    if [ -d $folder ]; then
      SETUP_SCRIPT="$folder/setup.sh"
      if [ -f $SETUP_SCRIPT ]; then
        bash $SETUP_SCRIPT $__TEST_PIPELINE_NAME
      fi
    fi
  done
  SETUP_SCRIPT='./test/integration/context/setup.sh'
  if [ -f $SETUP_SCRIPT ]; then
    bash $SETUP_SCRIPT $__TEST_PIPELINE_NAME
  fi

  SETUP_SCRIPT='./test/end-to-end/setup.sh'
  if [ -f $SETUP_SCRIPT ]; then
    bash $SETUP_SCRIPT $__TEST_PIPELINE_NAME
  fi

  # Test script
  istanbul cover ./node_modules/mocha/bin/_mocha -- --recursive -R spec
  RETCODE=$?

  echo 'Run breakdown scripts'
  # Run breakdown scripts that deletes the "mock" actions for integration tests
  BREAKDOWN_SCRIPT='./test/integration/conversation/breakdown.sh'
  if [ -f $BREAKDOWN_SCRIPT ]; then
    bash $BREAKDOWN_SCRIPT $__TEST_PIPELINE_NAME
  fi
  BREAKDOWN_SCRIPT='./test/integration/starter-code/breakdown.sh'
  if [ -f $BREAKDOWN_SCRIPT ]; then
    bash $BREAKDOWN_SCRIPT $__TEST_PIPELINE_NAME
  fi
  for folder in './test/integration/channels'/*; do
    if [ -d $folder ]; then
      BREAKDOWN_SCRIPT="$folder/breakdown.sh"
      if [ -f $BREAKDOWN_SCRIPT ]; then
        bash $BREAKDOWN_SCRIPT $__TEST_PIPELINE_NAME
      fi
    fi
  done
  BREAKDOWN_SCRIPT='./test/integration/context/breakdown.sh'
  if [ -f $BREAKDOWN_SCRIPT ]; then
    bash $BREAKDOWN_SCRIPT $__TEST_PIPELINE_NAME
  fi
  BREAKDOWN_SCRIPT='./test/end-to-end/breakdown.sh'
  if [ -f $BREAKDOWN_SCRIPT ]; then
    bash $BREAKDOWN_SCRIPT $__TEST_PIPELINE_NAME
  fi
exit $RETCODE
