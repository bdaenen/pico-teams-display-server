import { runAppleScript } from 'run-applescript'

export default async function getTeamsStatus () {
    return runAppleScript(`
    tell application "System Events" to tell process "Microsoft Teams"
        name of menu item 1 of menu 1 of menu bar 2
    end tell
    `)
}
