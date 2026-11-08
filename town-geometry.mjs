// Shared art and hit geometry; independent of texture dimensions and filenames.
export const townBuildingWidth=(site,level)=>site.width*(.82+level*.085);
export const townBuildingBaseline=key=>({arrowTower:.93,musicStage:.95,aidCamp:.78}[key]??.83);
