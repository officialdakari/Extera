export function initEruda() {
    const script = document.createElement('script');
    script.src="https://unpkg.com/eruda@3.2.3/eruda.js";
    document.body.append(script);
    script.onload = function () { 
        eruda.init(); 
    };
}