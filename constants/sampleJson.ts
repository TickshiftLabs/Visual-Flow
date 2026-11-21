/** Example document loaded by "Load an example" on the empty editor screen. */
export const SAMPLE_FILE_NAME = "order.json";

export const SAMPLE_JSON = JSON.stringify(
  {
    order: 4821,
    status: "paid",
    user: { name: "Ada", tier: "pro" },
    items: [
      { sku: "A-12", qty: 2, price: 19.5 },
      { sku: "B-07", qty: 1, price: 42 },
    ],
    shipping: {
      method: "express",
      gift: false,
      address: { city: "Leeds", zip: "LS1" },
    },
    tags: ["priority", "repeat-customer"],
  },
  null,
  2
);
