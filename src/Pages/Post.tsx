import { Suspense } from "react";
import {
  LimitType,
  PublicationType,
  profileId,
  usePublications,
} from "@lens-protocol/react-web";

import { PublicationCard } from "../Components/cards";
import { useInfiniteScroll } from "../hooks/useInfiniteScroll";
import MoonLoader from "./MoonLoader";

const PublicationsList = () => {
  const {
    data: publications,
    hasMore,
    loading,
    observeRef,
  } = useInfiniteScroll(
    usePublications({
      where: {
        from: [profileId("0x010040")],
        publicationTypes: [PublicationType.Post],
      },
      limit: LimitType.Ten,
    })
  );

  return (
    <div className="space-y-6">
      {publications &&
        publications.map((publication) => (
          <PublicationCard key={publication.id} publication={publication} />
        ))}
      {loading && (
        <div className="text-center text-gray-400">
          <MoonLoader size={40} />
        </div>
      )}
      {hasMore && !loading && (
        <p ref={observeRef} className="text-center text-gray-400">
          Loading more...
        </p>
      )}
    </div>
  );
};

export function UsePublications() {
  return (
    <div>
      <div className="py-1">
        <div className="max-w-2xl mx-auto px-4">
          <Suspense>
            <PublicationsList />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
