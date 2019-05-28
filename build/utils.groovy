def scale (NS, count) {
    sh "oc scale --replicas=${count} --namespace=${NS} dc/postgres"

    // wait for dependencies
    waitFor(NS, count, 'postgres')
}

def waitFor (NS, count, resource) {
    println "waiting for ${resource} to scale to ${count}"

    openshift.withCluster() {
        openshift.withProject(NS) {
            timeout(5) {
                def latestDeploymentVersion = openshift.selector('dc', resource).object().status.latestVersion
                def rc = openshift.selector('rc', "${resource}-${latestDeploymentVersion}")
                rc.untilEach(1) {
                    def rcMap = it.object()
                    def ready = rcMap.status.readyReplicas == null ? 0 : rcMap.status.readyReplicas
                    return (rcMap.status.replicas.equals(ready))
                }
            }
        }
    }
}

def withScaledEnv(NS, Closure step) {
    lock(NS) {
        try {
            scale(NS, 1)
            sh "oc get pods --namespace ${NS}"

            step()
        } finally {
            scale(NS, 0)
            sh "oc get pods --namespace ${NS}"
        }
    }
}

return this;
