import Data from './Data';

export default function(eventName) {
  var args = Array.prototype.slice.call(arguments, 1);
  if (args.length && typeof args[args.length - 1] === "function") {
    var callback = args.pop();
  }

  if (!Data.ddp) {
      throw new Error(
          "Data.ddp is null. " +
          "Please wait for ddp to be initialized before calling the server! " +
          "Was about to call " + eventName + " with " + args.join(";"));
  }

  const id = Data.ddp.method(eventName, args);
  Data.calls.push({
    id: id,
    callback: callback
  });
}

export function apply(eventName, args, callback) {
    if (!Data.ddp) {
        throw new Error(
            "Data.ddp is null. " +
            "Please wait for ddp to be initialized before calling the server! " +
            "Was about to apply " + eventName + " with " + args.join(";"));
    }

    const id = Data.ddp.method(eventName, args);
    Data.calls.push({
        id: id,
        callback: callback
    });
}