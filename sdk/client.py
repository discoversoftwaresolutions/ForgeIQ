# In sdk/client.py within ForgeIQClient class
async def list_projects(self) -> List[Dict[str, Any]]:
    logger.info("SDK: Listing all projects.")
    response_data = await self._request("GET", "/api/forgeiq/projects")
    return response_data.get("projects", [])
