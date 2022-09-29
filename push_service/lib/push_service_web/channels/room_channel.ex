defmodule PushServiceWeb.RoomChannel do
  use Phoenix.Channel

  def join("room:lobby", _message, socket) do
    {:ok, socket}
  end

  def join("room:lobby:" <> channel_id, _params, socket) do
    {:ok, assign(socket, :channel_id, channel_id)}
  end

  def handle_in("new_msg", %{"body" => body, "token" => token}, socket) do
    if(token != System.get_env("PUSH_SERVICE_KEY")) do
      {:noreply, socket}
    else
      broadcast!(socket, "new_msg", %{body: body})
      {:noreply, socket}
    end
  end

  def join("room:" <> _private_room_id, _params, _socket) do
    {:error, %{reason: "unauthorized"}}
  end
end