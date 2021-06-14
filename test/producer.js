/* eslint-disable max-len */
'use strict';

const kafka = require('kafka-node');
const HighLevelProducer = kafka.HighLevelProducer;
const client = new kafka.KafkaClient({kafkaHost: 'localhost:29092'});
const producer = new HighLevelProducer(client);

const messages = [
    {
        topic: 'platform.inventory.events',
        messages: '{"timestamp": "2019-05-24T18:08:06.510919+00:00", "id": "2d035613-a5c5-4d34-90ed-4f582aefb560", "type": "delete"}'
    },
    {
        topic: 'platform.receptor-controller.responses',
        messages: JSON.stringify({
            account: '6377882',
            sender: 'Job-1',
            message_type: 'response',
            message_id: 'a910d22d-ff4b-4178-9eec-2f04424983ff',
            payload: {
                console: 'This host is not known by Satellite',
                host: 'system-1',
                playbook_run_id: '00598b4a-2be2-4924-9863-7710240f5c49',
                sequence: 1,
                type: 'playbook_run_update'
            },
            code: 0,
            in_response_to: '65c0ba21-1015-4e7d-a6d6-4b530cbfb5bd',
            serial: 2
        })
    },
    {
        topic: 'platform.remediation-updates.advisor',
        messages: JSON.stringify({
            host_id: 'a910d22d-ff4b-4178-9eec-2f04424983ff',
            issues: ['advisor:CVE_2017_6074_kernel|KERNEL_CVE_2017_6074', 'advisor:CVE_2017_6074_kernel|KERNEL_CVE_2018_6075']
        })
    },
    {
        topic: 'platform.remediation-updates.compliance',
        messages: JSON.stringify({
            host_id: 'dde971ae-0a39-4c2b-9041-a92e2d5a96bb',
            issues: ['ssg:rhel7|standard|xccdf_org.ssgproject.content_rule_service_autofs_disabled']
        })
    },
    {
        topic: 'platform.remediation-updates.patch',
        messages: JSON.stringify({
            host_id: 'a910d22d-ff4b-4178-9eec-2f04424983ff',
            issues: ['patch:CVE_2017_6074_kernel|KERNEL_CVE_2017_6074']
        })
    },
    {
        topic: 'platform.remediation-updates.vulnerability',
        messages: JSON.stringify({
            host_id: 'a910d22d-ff4b-4178-9eec-2f04424983ff',
            issues: ['vulnerabilities:RHSA-2018:0502', 'vulnerabilities:CVE-2017-5715']
        })
    }
];

producer.send(messages, function (err, data) {
    if (err) {
        console.log(err); // eslint-disable-line no-console
    } else {
        console.log('message sent', data); // eslint-disable-line no-console
    }

    producer.close();
});
