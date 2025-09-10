// CitationCj4PlusModul.cpp

#include <stdio.h>
#include "CitationCj4PlusModul.h"
#include <MSFS/MSFS_Vars.h>
#include <MSFS/Legacy/gauges.h>
#include <MSFS\Utils\SimParamArrayHelper.h>
#include <iostream>

//std::string GetClipboardText()
//{
//    std::string text;
//    if (!OpenClipboard(nullptr))
//        return text;
//
//    HANDLE hData = GetClipboardData(CF_TEXT);
//    if (hData) {
//        char* pszText = static_cast<char*>(GlobalLock(hData));
//        if (pszText) {
//            text = pszText;
//            GlobalUnlock(hData);
//        }
//    }
//    CloseClipboard();
//    return text;
//}

double getLVar(const char* name, const char* type) {
	FsUnitId unitId = fsVarsGetUnitId(type);
	FsNamedVarId namedId = fsVarsRegisterNamedVar(name);
	double result = 0;
	fsVarsNamedVarGet(namedId, unitId, &result);
	return result;
}
double getAircraftVar(const char* name, const char* type, int index = 0) {
	FsVarParamArray param = FsCreateParamArray("i", index);

	FsUnitId unitId = fsVarsGetUnitId(type);
	FsSimVarId simvarId = fsVarsGetAircraftVarId(name);
	double out;
	bool r = fsVarsAircraftVarGet(simvarId, unitId, param, &out) ==
		FS_VAR_ERROR_NONE;
	return r ? out : 0;
}


extern "C" MSFS_CALLBACK void module_init(void)
{
	
}

extern "C" MSFS_CALLBACK void Update_StandAlone(float dTime)
{
	if (getLVar("CJ4_PLUS_ACTIVE", "number") != 1)
		return;
	double leftIgnition = getAircraftVar("GENERAL ENG STARTER", "bool", 1);
	double rightIgnition = getAircraftVar("GENERAL ENG STARTER", "bool", 2);
	double bat = getLVar("WT_CJ4_BATTERY_SWITCH_POS", "number");
	if (leftIgnition == 1 || rightIgnition == 1) {
		if (bat == 1) {
			double att_pitch = 0;
			execute_calculator_code("1 (>B:ENGINE_Starter_Disengage_Push)", &att_pitch, NULL, NULL);
		}
	}
	if (bat == 1) {

		double att_pitch = 0;
		if(getAircraftVar("CIRCUIT ON", "bool", 49) == 1)
			execute_calculator_code("49 (>K:ELECTRICAL_CIRCUIT_TOGGLE)", &att_pitch, NULL, NULL);
	}
}

extern "C" MSFS_CALLBACK void module_deinit(void)
{
	// This is called when the module is deinitialized
}
