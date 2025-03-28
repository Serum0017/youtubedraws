if(localStorage.getItem('setTitle') !== null){
    alert('already set title. You cannot set it again unless the server has restarted in between the last time you set it.');
}

const form =  document.getElementById('playForm');
const input = document.getElementById('input');

form.onsubmit = (e) => {
    if(input.value === '') return;
    changeTitle(input.value);
    input.value = '';
    return e.preventDefault();
}

const rand = Math.random();

const script = document.createElement('script');
if(rand < 0.33) script.src = '/title/particles.js'
else if(rand < 0.66) script.src = '/title/perlin.js';
else script.src = '/title/starField.js';

script.type = 'module';
document.body.appendChild(script);

document.getElementById('submitBtn').onclick = () => {
    if(input.value === ''){
        alert('Please Enter a title.');
        return;
    }
    changeTitle(input.value);
    input.value = '';
}

// good luck, botters.
function changeTitle(title){
    const headers = new Headers();
    headers.append('t', title);
    console.log('changing title to', {title});
    fetch(`${location.origin}/updateTitle`, {headers, method: 'POST'}).then(async (d) => {
        const succeeded = (await d.text());

        if(succeeded === 'badword'){
            alert('No bad words pls thanks :D');
            return;
        }
        if(succeeded !== 'n'){
            let queueTime = parseInt(succeeded);
            alert(`Title changed successfully! Your title is queued in a line that will take ${queueTime} minutes to get to you. Check my channel then!`);
        } else {
            alert('Title change failed');
        }
        
    })

    localStorage.setItem('setTitle', 'true');
}