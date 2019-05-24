#!/bin/bash

set -e

NAMESPACE=$(oc project -q)

if [[ $NAMESPACE != remediations* ]]; then
    echo "unexpected project: $NAMESPACE"
    exit 1;
fi

SUFFIX=${NAMESPACE##remediations-}
echo "Using values-${SUFFIX}.yaml"

helm template --values="values-${SUFFIX}.yaml" . | oc apply -f - | grep --color=auto -E 'configured|created|$'
