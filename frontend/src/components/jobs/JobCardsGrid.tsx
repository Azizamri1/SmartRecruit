import React from "react";
import JobCard, { type JobCardProps } from "./JobCard";
import "./JobCardsGrid.css";

type Props = {
  jobs: JobCardProps[];
  onApply?: (jobId: number) => void;
  onView?: (jobId: number) => void;
};

export default function JobCardsGrid({ jobs, onApply, onView }: Props) {
  return (
    <div className="jobGrid">
      {jobs.map(j => (
        <JobCard key={j.id} {...j} onApply={onApply} onView={onView} />
      ))}
    </div>
  );
}

