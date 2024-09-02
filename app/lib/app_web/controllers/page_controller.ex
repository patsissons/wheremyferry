defmodule AppWeb.PageController do
  use AppWeb, :controller

  def home(conn, _params) do
    # The home page is often custom made,
    # so skip the default app layout.
    render(conn, :home, layout: false)
  end

  def ferries(conn, _params) do
    # Fetch ferry data from the API
    case App.ApiClient.fetch_capacity() do
      {:ok, ferries} ->
        render(conn, :ferries, routes: ferries.routes)
      {:error, error} ->
        conn
        |> put_flash(:error, "Failed to fetch ferry data: #{inspect(error)}")
        |> redirect(to: ~p"/")
    end
  end
end
