export default defineEventHandler((event) => {
    const date = new Date()
    const dateFormatter = new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    })
    console.log(`${event.method} ${dateFormatter.format(new Date())} : ${event.path}`)
})