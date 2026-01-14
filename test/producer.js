/* eslint-disable max-len */
'use strict';

const { Kafka, logLevel } = require('kafkajs');

const errorTypes = ['unhandledRejection', 'uncaughtException']
const signalTraps = ['SIGTERM', 'SIGINT', 'SIGUSR2']
const kafka = new Kafka({
    logLevel: logLevel.DEBUG,
    brokers: ['localhost:29092'],
    clientId: 'testing-producer'
});
const producer = kafka.producer();

const messages = [
    {
        topic: 'platform.inventory.events',
        messages: [
            { value: '{"timestamp": "2019-05-24T18:08:06.510919+00:00", "id": "2d035613-a5c5-4d34-90ed-4f582aefb560", "type": "delete"}' }
        ]
    },
    {
        topic: 'platform.remediation-updates.advisor',
        messages: [
            { value: JSON.stringify({
                host_id: 'a910d22d-ff4b-4178-9eec-2f04424983ff',
                issues: ['advisor:CVE_2017_6074_kernel|KERNEL_CVE_2017_6074', 'advisor:CVE_2017_6074_kernel|KERNEL_CVE_2018_6075']
            })}
        ]
    },
    {
        topic: 'platform.remediation-updates.compliance',
        messages: [
            { value: JSON.stringify({
                host_id: 'dde971ae-0a39-4c2b-9041-a92e2d5a96bb',
                issues: ['ssg:rhel7|standard|xccdf_org.ssgproject.content_rule_service_autofs_disabled']
            })}
        ]
    },
    {
        topic: 'platform.remediation-updates.patch',
        messages: [
            { value: JSON.stringify({
                host_id: 'a910d22d-ff4b-4178-9eec-2f04424983ff',
                issues: ['patch:CVE_2017_6074_kernel|KERNEL_CVE_2017_6074']
            })}
        ]
    },
    {
        topic: 'platform.remediation-updates.vulnerability',
        messages: [
            { value: JSON.stringify({
                host_id: 'a910d22d-ff4b-4178-9eec-2f04424983ff',
                issues: ['vulnerabilities:RHSA-2018:0502', 'vulnerabilities:CVE-2017-5715']
            })}
        ]
    }
];

const sendMessage = (message) => {
    return producer.send(message)
    .then(console.log)
    .catch(e => console.error('[testing/producer] ', e.message));
};

const run = async () => {
    await producer.connect();
    for (let i = 0; i < messages.length; i++) {
        sendMessage(messages[i]);
    }
};

run().catch(e => console.error('[testing/producer] ', e.message));

errorTypes.map(type => {
  process.on(type, async () => {
    try {
      console.log(`process.on ${type}`)
      await producer.disconnect()
      process.exit(0)
    } catch (_) {
      process.exit(1)
    }
  })
})

signalTraps.map(type => {
  process.once(type, async () => {
    try {
      await producer.disconnect()
    } finally {
      process.kill(process.pid, type)
    }
  })
})
