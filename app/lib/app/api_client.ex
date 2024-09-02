defmodule App.ApiClient do
  @base_url "https://www.bcferriesapi.ca"
  @api_version "v2"

  defmodule FerrySailing do
    defstruct [
      :arrivalTime,
      :carFill,
      :fill,
      :oversizeFill,
      :sailingStatus,
      :time,
      :vesselName,
      :vesselStatus
    ]
  end

  defmodule FerryRoute do
    defstruct [
      :fromTerminalCode,
      :routeCode,
      :sailingDuration,
      :sailings
    ]
  end

  defmodule FerryRoutes do
    defstruct [
      :routes
    ]
  end

  def fetch_capacity do
    # /v2/capacity/
    # 1 min updates
    fetch_data(:capacity)
  end

  def fetch_noncapacity do
    # /v2/capacity/
    # 1 hour updates
    fetch_data(:noncapacity)
  end

  defp fetch_data(type, version \\ @api_version) do
    # url must end with a slash
    url = "#{@base_url}/#{version}/#{type}/"

    case HTTPoison.get(url) do
      {:ok, %HTTPoison.Response{status_code: 200, body: body}} ->
        case Poison.decode(body, as: %FerryRoutes{routes: [%FerryRoute{sailings: [%FerrySailing{}]}]}) do
          {:ok, ferries} -> {:ok, ferries}
          {:error, error} -> {:error, error}
        end
      {:ok, %HTTPoison.Response{status_code: 404}} ->
        {:error, "Not found"}
      {:ok, %HTTPoison.Response{status_code: status_code, body: body, headers: headers}} ->
        {:error, {status_code, body, headers}}
      {:error, %HTTPoison.Error{reason: reason}} ->
        {:error, reason}
    end
  end
end
