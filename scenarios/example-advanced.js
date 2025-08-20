export default {
  id: "shadow-signal",
  title: "OP SHADOW SIGNAL",
  objective: "Find two 4-digit codes.",
  init(engine) {
    engine.setCodes({ alpha: "5021", bravo: "7749" });
    engine.registerNode("alpha", {
      name: "relay-alpha",
      banner: "ALPHA up.",
      files: {
        "ops/a.msg": "Q09ERTogNTAyMQ=="
      }
    });
    engine.registerNode("bravo", {
      name: "store-bravo",
      banner: "BRAVO up.",
      files: {
        "intel/b.enc": "FRPERG: 7749"
      }
    });
    engine.onCommand("ping", (args, api) => api.log("reply from raven: ttl=42"));
  }
};
