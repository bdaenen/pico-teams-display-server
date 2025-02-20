#!/usr/bin/env node
import { SerialPort } from 'serialport'
import { DelimiterParser } from '@serialport/parser-delimiter'
import enquirer from 'enquirer'
import { getTeamsStatus, isMicrophoneActive } from './utils.js'
const { Select, Scale, Input } = enquirer

const port = await SerialPort.list().then(res =>
    res.find(p => p.vendorId?.toLowerCase() === '2e8a')
)

if (!port) {
    console.error('Failed to find Pico. Exiting...')
    process.exit()
}

console.log('Connected to pico on', port.path)
let isTrackingTeamsStatus = false
let trackingTimeoutRef = null
const serialport = new SerialPort({
    path: port.path,
    baudRate: 9600,
    parity: 'even',
    stopBits: 1,
})
const parser = serialport.pipe(new DelimiterParser({ delimiter: '\n' }))

parser.on('data', d => {
    console.log(`pico: ${d.toString()}`)
})

async function promptAction() {
    const action = await new Select({
        message: 'What do you want to do?',
        choices: [
            'Set status',
            'Set brightness',
            `${isTrackingTeamsStatus ? 'Stop monitoring' : 'Monitor'} teams status`,
            'Debug color'
        ],
    }).run()

    if (action === 'Set status') {
        const status = await new Select({
            message: 'Choose the new status',
            choices: [
                'available',
                'busy',
                'dnd',
                'away',
                'out of office',
                'clear',
            ],
        }).run()
        serialport.write(`status:${status}\n`)
    } else if (action === 'Set brightness') {
        const scale = await new Scale({
            message: 'Select a brightness',
            scale: [
                { name: '1', message: 'Dimmest' },
                { name: '2', message: '' },
                { name: '3', message: '' },
                { name: '4', message: '' },
                { name: '5', message: '' },
                { name: '5', message: '' },
                { name: '6', message: '' },
                { name: '7', message: '' },
                { name: '8', message: '' },
                { name: '9', message: 'Brightest' },
            ],
            choices: [
                {
                    name: '',
                    message: 'brightness',
                },
            ],
        }).run()
        const finalBrightness = (Number(scale.brightness) + 1) / 10
        console.log('writing', `brightness:${finalBrightness}\n`)
        serialport.write(`brightness:${finalBrightness}\n`)
    } else if (action === 'Monitor teams status') {
        isTrackingTeamsStatus = true
        let previousStatus = ''
        const statusMap = {
            Available: 'available',
            Busy: 'busy',
            'Do not disturb': 'dnd',
            'Be right back': 'away',
            'Appear away': 'away',
            'Out of office': 'out of office',
            'in a call': 'in a call',
        }
        async function checkTeamsStatusAndQueueNext() {
            try {
                let status = (await isMicrophoneActive())
                    ? 'in a call'
                    : await getTeamsStatus()
                if (previousStatus !== status) {
                    serialport.write(`status:${statusMap[status]}\n`)
                    console.log(
                        `Status changed: ${previousStatus} -> ${status}`
                    )
                }
                previousStatus = status
                trackingTimeoutRef = setTimeout(
                    checkTeamsStatusAndQueueNext,
                    2000
                )
            } catch (e) {
                console.error(e)
            }
        }
        await checkTeamsStatusAndQueueNext()
    } else if (action === 'Stop monitoring teams status') {
        clearTimeout(trackingTimeoutRef)
        isTrackingTeamsStatus = false
    }
    else if (action === 'Debug color') {
        const status = await new Input({
            message: 'Write the number in hex RGB (565) format'
        }).run()
        serialport.write(`color:${status}\n`)
    }
    promptAction()
}

promptAction()

// serialport.write('status:clear\n');
