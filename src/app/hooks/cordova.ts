export default function useCordova(): any | undefined {
    const w = window as any;
    if (!('cordova' in w)) return undefined;
    return w.cordova;
}