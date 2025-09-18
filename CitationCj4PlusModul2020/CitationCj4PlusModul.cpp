// CitationCj4PlusModul.cpp

#include <stdio.h>
#include "CitationCj4PlusModul.h"




State state;
double getVar(const std::string& name) {
	return state.vars[name];
}

void CALLBACK MyDispatchProc(SIMCONNECT_RECV* pData, DWORD cbData,
	void* pContext) {
	HRESULT hr;
	State* appState = reinterpret_cast<State*>(pContext);

	switch (pData->dwID) {
	case SIMCONNECT_RECV_ID_SIMOBJECT_DATA: {
		SIMCONNECT_RECV_SIMOBJECT_DATA* pObjData =
			(SIMCONNECT_RECV_SIMOBJECT_DATA*)pData;
		if (pObjData->dwRequestID == REQUEST_FETCH_LVARS) {
			int32_t* ptr = reinterpret_cast<int32_t*>(pObjData->dwData);
			appState->vars["L:CJ4_PLUS_ACTIVE"] = ptr[0];
			appState->vars["L:WT_CJ4_BATTERY_SWITCH_POS"] = ptr[1];
		}
		else if (pObjData->dwRequestID == REQUEST_FETCH_SIMVARS) {
			double* ptr = reinterpret_cast<double*>(pObjData->dwData);
			appState->vars["GENERAL ENG STARTER:1"] = ptr[0];
			appState->vars["GENERAL ENG STARTER:2"] = ptr[1];
			appState->vars["CIRCUIT ON:49"] = ptr[2];
		}
		break;
	}
	}

	SimConnect_CallDispatch(state.hSimConneect, MyDispatchProc, &state);
	if (getVar("L:CJ4_PLUS_ACTIVE") != 1)
		return;
	double leftIgnition = getVar("GENERAL ENG STARTER:1");
	double rightIgnition = getVar("GENERAL ENG STARTER:2");
	double bat = getVar("L:WT_CJ4_BATTERY_SWITCH_POS");
	if (leftIgnition == 1 || rightIgnition == 1) {
		if (bat == 1) {
			double att_pitch = 0;

			execute_calculator_code("0 (>K:STARTER1_SET)", &att_pitch, NULL, NULL);
			execute_calculator_code("0 (>K:SET_STARTER1_HELD)", &att_pitch, NULL, NULL);
			execute_calculator_code("0 (>K:STARTER2_SET)", &att_pitch, NULL, NULL);
			execute_calculator_code("0 (>K:SET_STARTER2_HELD)", &att_pitch, NULL, NULL);


		}
	}
	if (bat == 1) {

		double att_pitch = 0;
		if (getVar("CIRCUIT ON:49") == 1)
			execute_calculator_code("49 (>K:ELECTRICAL_CIRCUIT_TOGGLE)", &att_pitch, NULL, NULL);
	}

}
extern "C" MSFS_CALLBACK void module_init(void)
{
	if (SUCCEEDED(
		SimConnect_Open(&state.hSimConneect, "Citation CJ4+", NULL, 0, 0, 0))) {

		SimConnect_AddToDataDefinition(state.hSimConneect, DEFINITION_LVARS,
			"CJ4_PLUS_ACTIVE", "number");

		SimConnect_AddToDataDefinition(state.hSimConneect, DEFINITION_LVARS,
			"WT_CJ4_BATTERY_SWITCH_POS", "number");

		SimConnect_AddToDataDefinition(state.hSimConneect, DEFINITION_SIMVARS,
			"GENERAL ENG STARTER:1", "bool", SIMCONNECT_DATATYPE_INT32);
		SimConnect_AddToDataDefinition(state.hSimConneect, DEFINITION_SIMVARS,
			"GENERAL ENG STARTER:2", "bool", SIMCONNECT_DATATYPE_INT32);
		SimConnect_AddToDataDefinition(state.hSimConneect, DEFINITION_SIMVARS,
			"CIRCUIT ON:49", "bool", SIMCONNECT_DATATYPE_INT32);
		SimConnect_RequestDataOnSimObject(
			state.hSimConneect, REQUEST_FETCH_SIMVARS, DEFINITION_SIMVARS, SIMCONNECT_OBJECT_ID_USER,
			SIMCONNECT_PERIOD_VISUAL_FRAME);

		SimConnect_RequestDataOnSimObject(
			state.hSimConneect, REQUEST_FETCH_LVARS, DEFINITION_LVARS, SIMCONNECT_OBJECT_ID_USER,
			SIMCONNECT_PERIOD_VISUAL_FRAME);
	SimConnect_SubscribeToSystemEvent(state.hSimConneect, EVENT_FRAME, "Frame");
	

		SimConnect_CallDispatch(state.hSimConneect, MyDispatchProc, &state);

	}
}


extern "C" MSFS_CALLBACK void module_deinit(void)
{
	
	SimConnect_Close(state.hSimConneect);
	state.hSimConneect = NULL;
	state.vars.clear();
}
