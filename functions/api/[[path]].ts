type Env = { HUB: DurableObjectNamespace };
export const onRequest: PagesFunction<Env> = (context) =>
  context.env.HUB.get(context.env.HUB.idFromName('hanplay-v1')).fetch(context.request);
