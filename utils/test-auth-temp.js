'use strict';
function x(s){return fetch('https://api.github.com/user',{headers:{Authorization:'Bearer '+s}})}
