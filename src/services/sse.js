const clients = new Set();

export function addClient(client) {
  clients.add(client);
}

export function removeClient(client) {
  clients.delete(client);
}

export function broadcast(event, data, filterFn = null) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    if (!filterFn || filterFn(client)) {
      try {
        client.res.write(payload);
      } catch (err) {
        clients.delete(client);
      }
    }
  }
}

export default {
  addClient,
  removeClient,
  broadcast
};
