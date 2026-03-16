const locale = {
    navigate: "Navigate",
    select: "Select",
    dismiss: "Dismiss",
    drag: "Hold & drag",
    reset: "Reset",
    open: "Menu",
    placeholder: "Type a command or search...",
    nohits: "No results for",
    hint: "Search tips: some search terms require an exact match. Try typing the entire command name, or use a different word or phrase."
}

const options = [
    {
        title: "Mine aftaler",
        keywords: "alle mine aftaler",
        shortcut: "Alt+A",
        section: "Sager",
        handler: () => {
            setTimeout(() => { new Toast('Mine aftaler clicked') }, 100)
        },
    },

    {
        title: "Mine opgaver",
        keywords: "alle mine opgaver",
        shortcut: "Alt+O",
        section: "Sager",
        handler: () => {
            setTimeout(() => { new Toast('Mine opgaver clicked') }, 100)
        },
    },

    {
        title: "Indgående meddelelser",
        keywords: "alle mine beskeder mails sms",
        shortcut: "Alt+T",
        section: "Sager",
        handler: () => {
            setTimeout(() => { new Toast('Indgående meddelelser clicked') }, 100)
        },
    },

    {
        title: "Mine sager",
        keywords: "alle mine sager",
        shortcut: "Alt+S",
        section: "Sager",
        handler: () => {
            setTimeout(() => { new Toast('Mine sager clicked') }, 100)
        },
    },

    {
        title: "Sager jeg er tilknyttet",
        keywords: "alle mine sager tilknyttet",
        shortcut: "Alt+R",
        section: "Sager",
        handler: () => {
            setTimeout(() => { new Toast('Sager jeg er tilknytted clicked') }, 100)
        },
    },

    {
        title: "Skabeloner",
        keywords: "opsætning skabeloner mails sms besked journalnote",
        shortcut: "Alt+I",
        section: "Opsætning",
        handler: () => {
            setTimeout(() => { new Toast('Skabeloner clicked') }, 100)
        },
    },

    {
        title: "Nøgleord",
        keywords: "opsætning nøgleord sager",
        shortcut: "Alt+N",
        section: "Opsætning",
        handler: () => {
            setTimeout(() => { new Toast('Nøgleord clicked') }, 100)
        },
    },

    {
        title: "Notifikationer",
        keywords: "opsætning notifikationer systemmails sms beskeder",
        shortcut: "Alt+S",
        section: "Opsætning",
        handler: () => {
            setTimeout(() => { new Toast('Notifikationer clicked') }, 100)
        },
    },
]