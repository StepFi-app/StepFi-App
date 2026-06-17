import { useEffect, useState, useRef } from 'react';
import { useUserStore } from '../stores/user.store';

const TIER_ORDER = ['starter', 'bronze', 'silver', 'gold'];

export function useReputationMilestones() {
  const reputation = useUserStore((s) => s.reputation);
  const prevRepRef = useRef(reputation);
  const [showTierUp, setShowTierUp] = useState(false);
  const [newTier, setNewTier] = useState<string | null>(null);
  const [showMilestone, setShowMilestone] = useState(false);
  const [milestoneType, setMilestoneType] = useState<string | null>(null);

  useEffect(() => {
    // If we didn't have a previous reputation, just set it and return
    if (!prevRepRef.current && reputation) {
      prevRepRef.current = reputation;
      return;
    }

    if (!reputation || !prevRepRef.current) return;

    const prevRep = prevRepRef.current;
    
    // Tier up detection
    if (reputation.tier.toLowerCase() !== prevRep.tier.toLowerCase()) {
      const prevIdx = TIER_ORDER.indexOf(prevRep.tier.toLowerCase());
      const newIdx = TIER_ORDER.indexOf(reputation.tier.toLowerCase());
      
      // Only show if moving UP
      if (newIdx > prevIdx) {
        setNewTier(reputation.tier);
        setShowTierUp(true);
      }
    }

    // Milestone detection (e.g., reaching 25, 50, 75, 100)
    const milestones = [25, 50, 75, 100];
    const reachedMilestone = milestones.find(m => reputation.score >= m && prevRep.score < m);
    if (reachedMilestone) {
        setMilestoneType(`${reachedMilestone} Score Reached!`);
        setShowMilestone(true);
    }

    prevRepRef.current = reputation;
  }, [reputation]);

  return {
    showTierUp,
    newTier,
    closeTierUp: () => setShowTierUp(false),
    showMilestone,
    milestoneType,
    closeMilestone: () => setShowMilestone(false),
  };
}
