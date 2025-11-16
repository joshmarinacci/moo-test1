export class JoshLogger {
    insetCount: number

    constructor() {
        this.insetCount = 0
    }

    p(...args: any[]) {
        console.log(this.generate_tab(), ...args)
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
}