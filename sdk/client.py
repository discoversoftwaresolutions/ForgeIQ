# In sdk/client.py within ForgeIQClient class# In sdk/client.py
async def list_deployments(self, 
                           project_id: Optional[str] = None, 
                           service_name: Optional[str] = None,
                           environment: Optional[str] = None,
                           status: Optional[str] = None,
                           limit: int = 25
                           ) -> List[SDKDeploymentStatus]: # Assuming SDKDeploymentStatus is the model
    params = {"limit": limit}
    if project_id: params["project_id"] = project_id
    if service_name: params["service_name"] = service_name
    if environment: params["target_environment"] = environment
    if status: params["status"] = status

    response_data = await self._request("GET", "/api/forgeiq/deployments", params=params)
    # Ensure response_data["deployments"] items are cast/validated to SDKDeploymentStatus
    return [SDKDeploymentStatus(**item) for item in response_data.get("deployments", [])]

async def trigger_service_rollback(self, project_id: str, service_name: str, current_deployment_id: str) -> Dict[str, Any]:
    payload = {
        "project_id": project_id, 
        "service_name": service_name, 
        "rollback_target_type": "previous_successful", # Example
        "current_deployment_id_for_context": current_deployment_id
    }
    return await self._request("POST", "/api/forgeiq/deployments/rollback", json_data=payload)async def list_projects(self) -> List[Dict[str, Any]]:
    logger.info("SDK: Listing all projects.")
    response_data = await self._request("GET", "/api/forgeiq/projects")
    return response_data.get("projects", [])
# In sdk/client.py within ForgeIQClient class
async def list_pipeline_executions(self, 
                                 project_id: Optional[str] = None, 
                                 status: Optional[str] = None,
                                 limit: int = 25
                                ) -> List[SDKDagExecutionStatus]: # Returns list of status models
    params = {"limit": limit}
    if project_id: params["project_id"] = project_id
    if status: params["status"] = status

    response_data = await self._request("GET", "/api/forgeiq/pipelines/executions", params=params)
    return [SDKDagExecutionStatus(**item) for item in response_data.get("pipelines", [])]

async def rerun_pipeline(self, project_id: str, dag_id: str) -> Dict[str, Any]:
    endpoint = f"/api/forgeiq/pipelines/executions/{dag_id}/rerun"
    logger.info(f"SDK: Requesting rerun for DAG '{dag_id}' in project '{project_id}'")
    return await self._request("POST", endpoint, json_data={"project_id": project_id})
