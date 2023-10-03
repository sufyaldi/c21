// function confirmation(name) {
//     const answer = confirm (`Apakah kamu yakin akan menghapus data '${name}'`)
//     if(answer) return true
//     else return false
// }

// public/javascripts/alert.js
function confirmation(title) {
    const answer = confirm(`Apakah kamu yakin akan menghapus data '${title}'`);
    return answer;
}
