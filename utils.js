import { runAppleScript } from 'run-applescript'

export async function getTeamsStatus() {
    return runAppleScript(`
    tell application "System Events" to tell process "Microsoft Teams"
        name of menu item 1 of menu 1 of menu bar 2
    end tell
    `)
}

export async function isMicrophoneActive() {
    const output = await runAppleScript(`
    tell application "System Events" to tell process "Control Centre"
    	description of menu bar item 2 of menu bar 1
    end tell
    `)

    return /Microphone (is|are) in use/.test(output)
}
