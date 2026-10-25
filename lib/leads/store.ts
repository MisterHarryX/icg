import "server-only";
import { kvGet, kvIncr, kvMget, kvSadd, kvSet, kvSmembers, kvZadd, kvZrevrange } from "./kv";
import type { Lead } from "./types";

/** Redis layout (prefix icg:, like the rest of the site's data). */
const K = {
  seq: "icg:leads:seq",
  index: "icg:leads",
  lead: (id: number) => `icg:lead:${id}`,
  token: (token: string) => `icg:lead:token:${token}`,
  client: (tgId: number) => `icg:tg:client:${tgId}`,
};

export async function nextLeadId() {
  return kvIncr(K.seq);
}

export async function saveLead(lead: Lead) {
  lead.updatedAt = Date.now();
  await kvSet(K.lead(lead.id), JSON.stringify(lead));
}

/** First save: the lead plus its indexes. */
export async function insertLead(lead: Lead) {
  await saveLead(lead);
  await Promise.all([kvZadd(K.index, lead.createdAt, String(lead.id)), kvSet(K.token(lead.token), String(lead.id))]);
  if (lead.client) await kvSadd(K.client(lead.client.tgId), String(lead.id));
}

function parse(raw: string | null): Lead | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Lead;
  } catch {
    return null;
  }
}

export async function getLead(id: number) {
  if (!Number.isInteger(id) || id <= 0) return null;
  return parse(await kvGet(K.lead(id)));
}

export async function getLeads(ids: number[]) {
  const raws = await kvMget(ids.map(K.lead));
  return raws.map(parse).filter((lead): lead is Lead => lead !== null);
}

/** Newest first. */
export async function listLeads(limit = 500) {
  const ids = await kvZrevrange(K.index, 0, limit - 1);
  return getLeads(ids.map(Number));
}

export async function findLeadByToken(token: string) {
  if (!/^[A-Za-z0-9_-]{8,40}$/.test(token)) return null;
  const id = await kvGet(K.token(token));
  return id ? getLead(Number(id)) : null;
}

export async function addClientLead(tgId: number, leadId: number) {
  await kvSadd(K.client(tgId), String(leadId));
}

export async function clientLeads(tgId: number) {
  const ids = (await kvSmembers(K.client(tgId))).map(Number).sort((a, b) => b - a);
  return getLeads(ids.slice(0, 20));
}
