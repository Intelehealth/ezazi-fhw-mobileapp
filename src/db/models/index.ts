import Patient             from './Patient';
import PatientAttribute    from './PatientAttribute';
import PatientAttributeMaster from './PatientAttributeMaster';
import Visit               from './Visit';
import VisitAttribute      from './VisitAttribute';
import Encounter           from './Encounter';
import Obs                 from './Obs';
import Location            from './Location';
import Provider            from './Provider';
import ProviderAttribute   from './ProviderAttribute';
import DrSpeciality        from './DrSpeciality';
import UuidDictionary      from './UuidDictionary';
import ImageRecord         from './ImageRecord';
import UserCredentials     from './UserCredentials';
import RtcConnectionLog    from './RtcConnectionLog';

export {
  Patient,
  PatientAttribute,
  PatientAttributeMaster,
  Visit,
  VisitAttribute,
  Encounter,
  Obs,
  Location,
  Provider,
  ProviderAttribute,
  DrSpeciality,
  UuidDictionary,
  ImageRecord,
  UserCredentials,
  RtcConnectionLog,
};

export const modelClasses = [
  Patient,
  PatientAttribute,
  PatientAttributeMaster,
  Visit,
  VisitAttribute,
  Encounter,
  Obs,
  Location,
  Provider,
  ProviderAttribute,
  DrSpeciality,
  UuidDictionary,
  ImageRecord,
  UserCredentials,
  RtcConnectionLog,
];
