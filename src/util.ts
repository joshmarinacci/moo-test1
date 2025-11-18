export class JoshLogger {
    insetCount: number
    enabled: boolean

    constructor() {
        this.insetCount = 0
        this.enabled = true
    }

    p(...args: any[]) {
        if(this.enabled) {
            console.log(this.generate_tab(), ...args)
        }
    }

    private generate_tab() {
        let tab = ""
        for (let i = 0; i < this.insetCount; i++) {
            tab += "---"
        }
        return tab
    }

    indent() {
        this.insetCount += 1
    }

    outdent() {
        this.insetCount -= 1
    }

    enable() {
        this.enabled = true
    }
    disable() {
        this.enabled = false
    }
}