const RED = 31
const GREEN = 32
const colored = (color:number, output:string)=>{
    console.log(`\x1b[${color}m%s\x1b[0m`, output); // Another format for green
}
const green = (output:string)=>{
    console.log(`\x1b[32m%s\x1b[0m`, output); // Another format for green
}

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
    red(output:string) {
        if(this.enabled) {
            colored(RED,this.generate_tab() + " " + output)
        }
    }
    green(output:string) {
        if(this.enabled) {
            colored(GREEN,this.generate_tab() + " " + output)
        }
    }

    private generate_tab() {
        let tab = ""
        for (let i = 0; i < this.insetCount; i++) {
            tab += "   "
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

    warn(s: string) {
        console.log(this.generate_tab(), s)
    }

    error(...args: any[]) {
        if(this.enabled) {
            console.log(this.generate_tab(),'ERROR:', ...args)
        }
    }
}