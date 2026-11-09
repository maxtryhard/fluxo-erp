import { BriefcaseBusiness, Check, CircleDollarSign, FileText, GitBranch, UserRound, Users } from 'lucide-react';

/** Original, decorative UI shapes; they contain no customer records or financial measurements. */
export function FeatureIllustration({ sector }: { sector: number }) {
  return <div className={`entry-feature-art entry-art-${sector}`} aria-hidden="true">
    {sector === 1 ? <><div className="entry-art-paper"><FileText size={22} /><i /><i /><i /></div><span className="entry-art-seal"><Check size={23} /></span></>
      : sector === 2 ? <><span className="entry-art-account"><CircleDollarSign size={24} /></span><div className="entry-art-bars"><i /><i /><i /><i /></div></>
        : sector === 3 ? <div className="entry-art-team">{[0, 1, 2].map((person) => <span key={person}><UserRound size={25} /></span>)}</div>
          : <div className="entry-art-path"><span><BriefcaseBusiness size={22} /></span><i /><span><CircleDollarSign size={22} /></span><i /><span><Users size={22} /></span><GitBranch className="entry-art-path-mark" size={19} /></div>}
  </div>;
}
