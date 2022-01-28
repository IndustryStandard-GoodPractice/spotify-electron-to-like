window.addEventListener('DOMContentLoaded', () => {
    if(process.platform === 'darwin'){
        const mod = document.getElementById('mod')
        mod.innerText = 'Command'
    }
})