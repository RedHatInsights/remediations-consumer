# run our tests...
docker-compose -f build/docker-compose-unit_test.yml up --build --exit-code-from remediations-consumer

result=$?

docker-compose -f build/docker-compose-unit_test.yml down

echo $WORKSPACE
pwd
ls
