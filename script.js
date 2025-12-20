import {mapType} from './mapType.js'
import data from './asn1_definitions.json'
import ASN1Database from './asn1-query-browser.js'
const window = {}
const db = new ASN1Database(data)
window.asn1db = db
export function init(){
return mapType(db.definitions.filter(f=>f.definition?.tags === "")[0], db)
}