export function connectAlertsSocket(
  endpointId: string,
  onMessage: (data: any) => void
) {
  const ws = new WebSocket(
    `ws://localhost:8000/ws/alerts?endpoint_id=${endpointId}`
  );

  ws.onmessage = (event) => {
    onMessage(JSON.parse(event.data));
  };

  return ws;
}
